import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/authContext/auth-context";
import AppNotification from "../../components/Notification";
import { resendOtp, verifyOtp } from "../../functions/auth";

export default function VerifyOTP() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();

  const email = user?.userData?.email || "";
  const name = user?.userData?.name || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ⏱️ Timer
  useEffect(() => {
    if (timeLeft === 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 🔢 OTP change
  const handleOtpChange = (index: number, value: string) => {
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Clear notification on input
      setNotification({ visible: false, message: "", type: "success" });

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 🔐 VERIFY OTP
  const handleVerifyOTP = async () => {
    const code = otp.join("");
    const user_id = user?.userData?.id;

    setNotification({ visible: false, message: "", type: "success" });

    if (!user_id) {
      setNotification({
        visible: true,
        message: "User not found. Please login again.",
        type: "error",
      });
      return;
    }

    if (code.length !== 6) {
      setNotification({
        visible: true,
        message: "Please enter a valid 6-digit OTP",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOtp(user_id, code);

      switch (result?.message) {
        case "OTP_VERIFIED":
          setNotification({
            visible: true,
            message: "OTP verified successfully ✅",
            type: "success",
          });
          await refreshUser();
          router.replace("/");
          break;
        case "INVALID_OTP":
          setNotification({
            visible: true,
            message: "Invalid OTP. Please try again.",
            type: "error",
          });
          break;

        case "OTP_EXPIRED":
          setNotification({
            visible: true,
            message: "OTP has expired. Request a new one.",
            type: "error",
          });
          break;

        case "MISSING_FIELDS":
          setNotification({
            visible: true,
            message: "Missing required fields.",
            type: "error",
          });
          break;

        default:
          setNotification({
            visible: true,
            message: "Something went wrong. Try again.",
            type: "error",
          });
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || "An error occurred",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔁 RESEND OTP
  const handleResendOTP = async () => {
    setResendLoading(true);
    setNotification({ visible: false, message: "", type: "success" });

    const userId = user?.userData?.id || user?.id;

    try {
      const result = await resendOtp(userId);

      switch (result?.message) {
        case "OTP_RESENT":
          // ✅ Reset timer
          setTimeLeft(60);
          setCanResend(false);

          // ✅ Clear OTP inputs
          setOtp(["", "", "", "", "", ""]);

          // ✅ Show success
          setNotification({
            visible: true,
            message: "OTP resent successfully 📩",
            type: "success",
          });
          break;
        case "OTP_CREATE_FAILED":
          setNotification({
            visible: true,
            message: "Failed to generate OTP.",
            type: "error",
          });
          break;

        case "MISSING_FIELDS":
          setNotification({
            visible: true,
            message: "Missing required fields.",
            type: "error",
          });
          break;

        case "EMAIL_SEND_FAILED":
          setNotification({
            visible: true,
            message:
              "Could not send email. Check server email (SMTP/SendGrid) configuration.",
            type: "error",
          });
          break;

        default:
          setNotification({
            visible: true,
            message: "Failed to resend OTP.",
            type: "error",
          });
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || "An error occurred",
        type: "error",
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <LinearGradient colors={["#FF6B6B", "#FF8E8E"]} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>📧</Text>
            <Text style={styles.headerTitle}>Hi, {name}</Text>
            <Text style={styles.headerSubtitle}>
              Enter the 6-digit code sent to {email}
            </Text>
          </View>
        </LinearGradient>

        {/* OTP SECTION */}
        <View style={styles.otpSection}>
          <Text style={styles.sectionTitle}>Enter OTP Code</Text>
          <Text style={styles.sectionDesc}>
            Check your email for the verification code
          </Text>

          {/* OTP INPUTS */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref: any) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={1}
                placeholder="•"
                textAlign="center"
                editable={!loading}
              />
            ))}
          </View>

          {/* VERIFY BUTTON */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading || otp.some((d) => d === "")}
          >
            <LinearGradient
              colors={["#FF6B6B", "#FF5252"]}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify OTP</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* RESEND */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn’t receive the code?</Text>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend || resendLoading}
              style={styles.resendButtonContainer}
            >
              {resendLoading ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : canResend ? (
                <Text style={styles.activeText}>Resend OTP</Text>
              ) : (
                <View style={styles.circularTimer}>
                  <View
                    style={[
                      styles.circularTimerBorder,
                      {
                        opacity: timeLeft / 60,
                      },
                    ]}
                  />
                  <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 20,
    zIndex: 10,
  },
  headerContent: {
    alignItems: "center",
    marginTop: 10,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textAlign: "center",
  },
  otpSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: "#999",
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 30,
  },
  otpInput: {
    width: 48, // 👈 fixed width
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  verifyButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorBox: {
    backgroundColor: "#FFEAEA",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },

  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },

  successBox: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
  },

  successText: {
    color: "#2E7D32",
    fontSize: 14,
  },

  activeText: {
    color: "#FF6B6B",
    fontWeight: "600",
  },

  disabledText: {
    color: "#CCC",
  },
  resendSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  resendText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  resendButtonContainer: {
    height: 80,
    width: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  circularTimer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  circularTimerBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FF6B6B",
    position: "absolute",
  },
  timerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FF6B6B",
    zIndex: 1,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B6B",
  },
  resendButtonTextDisabled: {
    color: "#CCC",
  },
  infoBox: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: "#FF6B6B",
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: "#FF6B6B",
    fontWeight: "600",
  },
});
