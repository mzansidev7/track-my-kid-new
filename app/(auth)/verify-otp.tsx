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
        <LinearGradient colors={["#173F70", "#1683F8"]} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <MaterialIcons
              name="email"
              size={32}
              color="#FFFFFF"
              style={styles.headerIcon}
            />
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
              colors={["#173F70", "#1683F8"]}
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
                <ActivityIndicator size="small" color="#1683F8" />
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
    backgroundColor: "#F5FAFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    marginBottom: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: {
    position: "absolute",
    left: 14,
    top: 14,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  headerContent: {
    alignItems: "center",
    marginTop: 8,
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  otpSection: {
    marginHorizontal: 18,
    marginTop: 4,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8EAF9",
    backgroundColor: "#FFFFFF",
    shadowColor: "#174574",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#174574",
    marginBottom: 5,
  },
  sectionDesc: {
    fontSize: 11,
    color: "#64809C",
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginBottom: 22,
  },
  otpInput: {
    flex: 1,
    maxWidth: 46,
    height: 50,
    backgroundColor: "#FFF",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D8E4EF",
    fontSize: 19,
    fontWeight: "800",
    color: "#174574",
  },
  verifyButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#174574",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonGradient: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    fontSize: 15,
    fontWeight: "800",
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
    color: "#1769D2",
    fontWeight: "700",
    fontSize: 11,
  },

  disabledText: {
    color: "#CCC",
  },
  resendSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  resendText: {
    fontSize: 10,
    color: "#64809C",
    marginBottom: 8,
  },
  resendButtonContainer: {
    height: 38,
    minWidth: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  circularTimer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  circularTimerBorder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: "#1683F8",
    position: "absolute",
  },
  timerText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1769D2",
    zIndex: 1,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1769D2",
  },
  resendButtonTextDisabled: {
    color: "#CCC",
  },
  infoBox: {
    backgroundColor: "#EDF6FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  infoText: {
    fontSize: 11,
    color: "#35516B",
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    paddingHorizontal: 18,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#64809C",
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: "#1769D2",
    fontWeight: "600",
  },
});
