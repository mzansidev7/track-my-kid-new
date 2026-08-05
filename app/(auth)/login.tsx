import { MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
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
import Notification from "../../components/Notification";
import { loginUser } from "../../functions/auth";
import { useTheme } from "../../styles/theme";
import { BASE_URL } from "../../url";

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
    } catch (error: any) {
      console.error("Login error:", error);
      setNotification({
        visible: true,
        message:
          error?.response?.data?.message || "Login failed. Please try again.",
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
      <Notification
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
                backgroundColor: colors.background,
                shadowColor: shadows.md.shadowColor,
              },
            ]}
          >
            <FloatingInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              leftIcon={<MaterialIcons name="email" size={20} color="#999" />}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FloatingInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              leftIcon={<MaterialIcons name="lock" size={20} color="#999" />}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color="#999"
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
                colors={["#4E54FF", "#3247FF"]}
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

            <View style={loginStyles.dividerRow}>
              <View style={loginStyles.dividerLine} />
              <Text
                style={[
                  loginStyles.dividerText,
                  { color: colors.text.secondary },
                ]}
              >
                or continue with
              </Text>
              <View style={loginStyles.dividerLine} />
            </View>

            <TouchableOpacity
              style={loginStyles.socialButton}
              activeOpacity={0.85}
            >
              <View style={loginStyles.socialInner}>
                <AntDesign name="google" size={20} color="#111" />
                <Text style={loginStyles.socialBtnText}>
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={loginStyles.socialButton}
              activeOpacity={0.85}
            >
              <View style={loginStyles.socialInner}>
                <AntDesign name="apple" size={20} color="#111" />
                <Text style={loginStyles.socialBtnText}>
                  Continue with Apple
                </Text>
              </View>
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
    backgroundColor: "#F8FBFF",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  topSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: "contain",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -10,
    marginBottom: 18,
  },
  forgotText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 6,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#64748B",
    fontSize: 12,
  },
  socialButton: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    paddingVertical: 14,
    marginBottom: 12,
  },
  socialInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: {
    marginRight: 10,
  },
  socialBtnText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
  },
  bottomText: {
    color: "#64748B",
    fontSize: 13,
  },
  linkText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
  heroImage: {
    width: "100%",
    maxWidth: 520,
    height: 240,
    marginTop: 10,
    borderRadius: 24,
  },
  headerRow: {
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 16,
  },

  backButton: {
    position: "absolute",
    left: 0,

    width: 44,
    height: 44,
    borderRadius: 22,

    borderWidth: 1,

    justifyContent: "center",
    alignItems: "center",
  },

  roleTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalForm: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  resetButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  resetButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
