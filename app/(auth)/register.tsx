import { useTheme } from "../../styles/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestRegistrationLink, userAuth } from "../../functions/auth";
import { BASE_URL } from "../../url";
import { useAuth } from "../../context/authContext/auth-context";
import { useRouter } from "expo-router";

import FloatingInput from "../../components/FloatingInput";
import AppNotification from "../../components/Notification";

type FormErrors = {
  email?: string;
  name?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
};

interface DriverScanData {
  ownerId: string;
  vehicleId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  vehicleName?: string;
  licensePlate?: string;
}

export default function Register({
  userType: propUserType,
  setSignupVisible,
  setVisible,
}: any) {
  // navigation handled by parent welcome modal props
  const userType = propUserType || "client";

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: userType,
  });

  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const [errors, setErrors] = useState<FormErrors>({});
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    visible: false,
    message: "",
    type: "success",
  });
  const [driverScanData, setDriverScanData] = useState<DriverScanData | null>(
    null,
  );
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null,
  );
  const [scanLoading, setScanLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setFormData({
      email: "",
      name: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: userType,
    });
    setErrors({});
    setDriverScanData(null);
    setScanned(false);
    setScanModalVisible(false);
    setCameraPermission(null);
    setScanLoading(false);
    setLoading(false);
  }, [userType]);

  const userColors =
    userType === "driver"
      ? (["#3B82F6", "#3B82F6"] as const)
      : userType === "owner"
        ? (["#34C759", "#20B94D"] as const)
        : userType === "client"
          ? (["#FF9F0A", "#FF7A00"] as const)
          : userType === "admin"
            ? (["#0F766E", "#14B8A6"] as const)
            : (["#F3A6F3", "#F3A6F3"] as const);

  const roleBackgrounds = {
    driver: require("@/assets/images/driver.jpeg"),
    client: require("@/assets/images/client.png"),
    owner: require("@/assets/images/owner.png"),
    school: require("@/assets/images/school.jpeg"),
    admin: require("@/assets/images/owner.png"),
  } as const;

  const selectedBackground =
    roleBackgrounds[userType as keyof typeof roleBackgrounds] ||
    roleBackgrounds.client;

  const showRegistrationForm = userType !== "driver" || Boolean(driverScanData);
  const pageTitle =
    userType === "driver" && !driverScanData
      ? "Scan owner vehicle QR"
      : "Create your account";
  const pageSubtitle =
    userType === "driver" && !driverScanData
      ? "Verify the owner vehicle QR code first to start driver registration."
      : "Join Track My Kid and get started.";

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === "granted");
    if (status !== "granted") {
      Alert.alert(
        "Camera permission required",
        "Please allow camera access to scan the owner vehicle QR code.",
      );
    }
    return status === "granted";
  };

  const openScanModal = async () => {
    const granted =
      cameraPermission === null
        ? await requestCameraPermission()
        : cameraPermission;

    if (!granted) {
      return;
    }

    setScanned(false);
    setScanModalVisible(true);
  };

  const handleBarcodeScanned = async ({ data }: any) => {
    if (scanned) return;
    setScanned(true);
    setScanLoading(true);

    try {
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      const response = await fetch(`${BASE_URL}/driver/verify-qr-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Unable to verify QR code",
        );
      }

      const {
        ownerId,
        vehicleId,
        ownerName,
        ownerEmail,
        ownerPhone,
        vehicleName,
        licensePlate,
      } = result;

      if (!ownerId || !vehicleId) {
        throw new Error(
          "QR code did not contain owner and vehicle information",
        );
      }

      setDriverScanData({
        ownerId,
        vehicleId,
        ownerName,
        ownerEmail,
        ownerPhone,
        vehicleName,
        licensePlate,
      });

      setNotification({
        visible: true,
        message: "Owner vehicle QR verified. Complete your registration.",
        type: "success",
      });
      setScanModalVisible(false);
    } catch (error: any) {
      console.error("QR scan error:", error);
      setNotification({
        visible: true,
        message:
          typeof error?.message === "string"
            ? error.message
            : "Invalid QR code. Try again.",
        type: "error",
      });
      setScanned(false);
    } finally {
      setScanLoading(false);
    }
  };

  const validate = () => {
    const e: any = {};

    if (userType === "school") {
      if (!formData.email) e.email = "Enter your email address";
    } else {
      if (!formData.name) e.name = "Enter your full name";
      if (!formData.phone) e.phone = "Enter your phone number";
      if (!formData.password) e.password = "Create a password";
      if (!formData.confirmPassword)
        e.confirmPassword = "Confirm your password";
      if (
        formData.password &&
        formData.confirmPassword &&
        formData.password !== formData.confirmPassword
      ) {
        e.confirmPassword = "Passwords do not match";
      }
      if (!formData.email) e.email = "Enter your email address";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      if (userType === "school") {
        await requestRegistrationLink(formData.email, userType);

        setNotification({
          visible: true,
          message:
            "A registration link has been sent to your email. Please open it to continue.",
          type: "success",
        });
      } else {
        await userAuth({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: userType,
        });

        await refreshUser();

        setNotification({
          visible: true,
          message:
            "Account created successfully. Redirecting to verification...",
          type: "success",
        });

        setTimeout(() => {
          setSignupVisible?.(false);
          setVisible?.(false);
          router.replace("/(auth)/verify-otp");
        }, 400);
      }

      if (userType === "school") {
        setTimeout(() => {
          setSignupVisible?.(false);
          setVisible?.(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const serverText =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message;
      setNotification({
        visible: true,
        message:
          typeof serverText === "string" && serverText.length > 0
            ? serverText
            : "Registration failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundLayer} pointerEvents="none">
        <Image source={selectedBackground} style={styles.backgroundImage} />
        <View style={styles.backgroundOverlay} />
      </View>
      <AppNotification
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onHide={() => setNotification({ ...notification, visible: false })}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            styles.scrollContentGrow,
          ]}
        >
          <View style={styles.topSection}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setSignupVisible?.(false);
                  setVisible?.(false);
                }}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>

              <Text style={styles.roleTitle}>{pageTitle}</Text>
            </View>

            <Text style={styles.subtitle}>{pageSubtitle}</Text>
          </View>

          <View style={styles.card}>
            {userType === "driver" ? (
              <View style={styles.scanSection}>
                <Text style={styles.scanTitle}>Driver onboarding</Text>
                <Text style={styles.scanDescription}>
                  Scan the owner vehicle QR code to link your driver account to
                  the owner and vehicle before creating your account.
                </Text>
                {driverScanData ? (
                  <View style={styles.scanInfoCard}>
                    <Text style={styles.scanInfoLabel}>Vehicle</Text>
                    <Text style={styles.scanInfoText}>
                      {driverScanData.vehicleName || "Verified vehicle"}
                    </Text>
                    <Text style={styles.scanInfoText}>
                      {driverScanData.licensePlate}
                    </Text>
                    <Text style={styles.scanInfoLabel}>Owner</Text>
                    <Text style={styles.scanInfoText}>
                      {driverScanData.ownerName || "Verified owner"}
                    </Text>
                    <Text style={styles.scanInfoText}>
                      {driverScanData.ownerEmail || driverScanData.ownerPhone}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.scanPromptCard}>
                    <Text style={styles.scanPromptText}>
                      Scan the owner vehicle QR code first. Once verified, you
                      can complete your registration details.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={openScanModal}
                  style={styles.scanButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.scanButtonText}>
                    {driverScanData
                      ? "Rescan owner vehicle QR"
                      : "Scan owner vehicle QR"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {showRegistrationForm ? (
              <>
                {userType === "school" ? (
                  <FloatingInput
                    label="Email address"
                    value={formData.email}
                    onChangeText={(t: any) =>
                      setFormData({ ...formData, email: t })
                    }
                    error={errors.email}
                    leftIcon={
                      <MaterialIcons name="email" size={20} color="#999" />
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <>
                    <FloatingInput
                      label="Full name"
                      value={formData.name || ""}
                      onChangeText={(t: any) =>
                        setFormData({ ...formData, name: t })
                      }
                      error={errors.name}
                      leftIcon={
                        <MaterialIcons name="person" size={20} color="#999" />
                      }
                    />

                    <FloatingInput
                      label="Email address"
                      value={formData.email}
                      onChangeText={(t: any) =>
                        setFormData({ ...formData, email: t })
                      }
                      error={errors.email}
                      leftIcon={
                        <MaterialIcons name="email" size={20} color="#999" />
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <FloatingInput
                      label="Phone number"
                      value={formData.phone || ""}
                      onChangeText={(t: any) =>
                        setFormData({ ...formData, phone: t })
                      }
                      error={errors.phone}
                      leftIcon={
                        <MaterialIcons name="phone" size={20} color="#999" />
                      }
                    />

                    <FloatingInput
                      label="Create password"
                      value={formData.password || ""}
                      onChangeText={(t: any) =>
                        setFormData({ ...formData, password: t })
                      }
                      secureTextEntry={!showPassword}
                      error={errors.password}
                      leftIcon={
                        <MaterialIcons name="lock" size={20} color="#999" />
                      }
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <MaterialIcons
                            name={
                              showPassword ? "visibility" : "visibility-off"
                            }
                            size={20}
                            color="#999"
                          />
                        </TouchableOpacity>
                      }
                    />

                    <FloatingInput
                      label="Confirm password"
                      value={formData.confirmPassword || ""}
                      onChangeText={(t: any) =>
                        setFormData({
                          ...formData,
                          confirmPassword: t,
                        })
                      }
                      secureTextEntry={!showConfirmPassword}
                      error={errors.confirmPassword}
                      leftIcon={
                        <MaterialIcons
                          name="lock-outline"
                          size={20}
                          color="#999"
                        />
                      }
                      rightIcon={
                        <TouchableOpacity
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <MaterialIcons
                            name={
                              showConfirmPassword
                                ? "visibility"
                                : "visibility-off"
                            }
                            size={20}
                            color="#999"
                          />
                        </TouchableOpacity>
                      }
                    />
                  </>
                )}
              </>
            ) : null}

            <Modal
              visible={scanModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setScanModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.scanModalCard}>
                  <Text style={styles.modalTitle}>Scan owner vehicle QR</Text>
                  <View style={styles.scanCameraWrapper}>
                    <CameraView
                      style={styles.cameraView}
                      onBarcodeScanned={handleBarcodeScanned}
                    />
                    {scanLoading ? (
                      <View style={styles.scanLoadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.scanLoadingText}>
                          Verifying QR...
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.understandBtn,
                      { backgroundColor: userColors[0] },
                    ]}
                    onPress={() => setScanModalVisible(false)}
                  >
                    <Text style={styles.understandBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* ERROR */}
            {Object.keys(errors).length > 0 && (
              <Text
                style={{
                  color: "#FF453A",
                  marginTop: 10,
                  fontSize: 13,
                }}
              >
                Please fix the highlighted fields
              </Text>
            )}

            {userType === "driver" && !driverScanData ? (
              <Text style={styles.scanRequiredText}>
                You must scan an owner vehicle QR code before completing driver
                registration.
              </Text>
            ) : null}

            {showRegistrationForm ? (
              <>
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.9}
                  style={styles.primaryButton}
                >
                  <LinearGradient
                    colors={userColors}
                    style={[
                      styles.primaryButtonGradient,
                      loading ? styles.primaryButtonDisabled : {},
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text
                        style={[styles.primaryButtonText, { color: "white" }]}
                      >
                        {userType === "school"
                          ? "Send invitation link"
                          : "Register"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => {
                setSignupVisible?.(false);
                setVisible?.(true);
              }}
            >
              <Text style={styles.linkText}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: "100%",
    paddingBottom: 40,
  },
  scrollContentGrow: {
    justifyContent: "space-between",
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    alignItems: "center",
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: "contain",
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  primaryButton: {
    marginTop: 20,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ECECEC",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#999",
    fontSize: 13,
  },
  socialButton: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  socialInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 10,
  },
  socialBtnText: {
    fontSize: 15,
    color: "#111",
    fontWeight: "700",
  },
  bottomRow: {
    marginTop: 24,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "center",
  },
  bottomText: {
    color: "#777",
    fontSize: 14,
  },
  linkText: {
    color: "#3066E3",
    fontWeight: "700",
    fontSize: 14,
  },
  heroImage: {
    width: "100%",
    height: 260,
    marginTop: 26,
    marginHorizontal: 0,
    alignSelf: "stretch",
  },
  formErrorText: {
    color: "#FF453A",
    marginTop: 10,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#FFFFFF", // or colors.background
  },

  modalCard: {
    flex: 1,
    backgroundColor: "#FFFFFF", // or colors.background
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },

  modalScroll: {
    flex: 1,
  },

  modalBody: {
    fontSize: 15,
    lineHeight: 26,
    color: "#444",
    paddingBottom: 30,
  },

  modalBold: {
    fontWeight: "700",
    color: "#111",
  },

  understandBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  understandBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  modalClose: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  modalCloseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  scanSection: {
    marginBottom: 20,
    backgroundColor: "#F7F9FF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E4E8FF",
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  scanDescription: {
    color: "#555",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  scanInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8EBF8",
  },
  scanInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
    marginTop: 10,
  },
  scanInfoText: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  scanPromptCard: {
    backgroundColor: "#EAF4FF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D0E7FF",
  },
  scanPromptText: {
    color: "#1F3C72",
    fontSize: 14,
    lineHeight: 20,
  },
  scanRequiredText: {
    color: "#D36B5C",
    fontSize: 13,
    marginBottom: 12,
  },
  scanModalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
  },
  scanCameraWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#000",
  },
  cameraView: {
    flex: 1,
  },
  scanLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scanLoadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
  },

  infoIcon: {
    marginTop: 1,
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
