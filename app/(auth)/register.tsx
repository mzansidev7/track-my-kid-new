import { useTheme } from "../../styles/theme";
import { MaterialIcons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  terms?: string;
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
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
    setAcceptedTerms(false);
    setTermsModalVisible(false);
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
    if (!acceptedTerms) {
      e.terms = "You must agree to the Terms and Conditions to continue.";
    }

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
                      <MaterialIcons name="email" size={18} color="#64809C" />
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
                        <MaterialIcons
                          name="person"
                          size={18}
                          color="#64809C"
                        />
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
                        <MaterialIcons name="email" size={18} color="#64809C" />
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
                        <MaterialIcons name="phone" size={18} color="#64809C" />
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
                        <MaterialIcons name="lock" size={18} color="#64809C" />
                      }
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <MaterialIcons
                            name={
                              showPassword ? "visibility" : "visibility-off"
                            }
                            size={18}
                            color="#64809C"
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
                          size={18}
                          color="#64809C"
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
                            size={18}
                            color="#64809C"
                          />
                        </TouchableOpacity>
                      }
                    />
                  </>
                )}

                <View style={styles.termsRow}>
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    accessibilityLabel="Agree to the Terms and Conditions"
                    onPress={() => {
                      if (acceptedTerms) {
                        setAcceptedTerms(false);
                      } else {
                        setTermsModalVisible(true);
                      }
                    }}
                    style={[
                      styles.termsCheckbox,
                      acceptedTerms && styles.termsCheckboxChecked,
                      errors.terms ? styles.termsCheckboxError : null,
                    ]}
                  >
                    {acceptedTerms ? (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    ) : null}
                  </TouchableOpacity>
                  <Text style={styles.termsCopy}>
                    I agree to the{" "}
                    <Text
                      accessibilityRole="button"
                      onPress={() => setTermsModalVisible(true)}
                      style={styles.termsLink}
                    >
                      Terms and Conditions
                    </Text>
                  </Text>
                </View>
                {errors.terms ? (
                  <Text accessibilityRole="alert" style={styles.termsErrorText}>
                    {errors.terms}
                  </Text>
                ) : null}
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
                  disabled={loading || !acceptedTerms}
                  activeOpacity={0.9}
                  style={[
                    styles.primaryButton,
                    (!acceptedTerms || loading) && styles.primaryButtonDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={userColors}
                    style={styles.primaryButtonGradient}
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

      <Modal
        visible={termsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalCard}>
            <View style={styles.termsModalHeader}>
              <View>
                <Text style={styles.termsModalEyebrow}>TRACK MY KID</Text>
                <Text style={styles.termsModalTitle}>Terms and Conditions</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close terms"
                onPress={() => setTermsModalVisible(false)}
                style={styles.termsModalClose}
              >
                <MaterialIcons name="close" size={20} color="#35516B" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.termsModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.termsIntro}>
                Please read these terms before creating an account or requesting
                a school registration link. By accepting, you agree to use
                Track My Kid responsibly and in accordance with these terms.
              </Text>
              <Text style={styles.termsSectionTitle}>Using the service</Text>
              <Text style={styles.termsParagraph}>
                Track My Kid provides tools for transport coordination, trip
                updates, and related communication. Live location and trip
                information depend on device connectivity, GPS availability, and
                updates from the transport provider; they may be delayed or
                unavailable. Features may differ by account role, school,
                transport provider, subscription, or device.
              </Text>
              <Text style={styles.termsSectionTitle}>Your account</Text>
              <Text style={styles.termsParagraph}>
                Provide accurate registration information, keep your sign-in
                details secure, and use your account only for its intended role.
                You are responsible for activity carried out through your
                account and should tell us promptly if you suspect unauthorized
                access. Do not impersonate another person, share access in a way
                that compromises account security, or create accounts using
                information you are not authorized to use. We may ask for
                information needed to verify an account or its role.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Children and trip information
              </Text>
              <Text style={styles.termsParagraph}>
                Only submit a child&apos;s, family&apos;s, driver&apos;s, or
                school&apos;s information when you are authorized to do so,
                including any consent required from a parent, guardian, school,
                or other responsible person. Keep that information accurate and
                up to date. Use children&apos;s, trip, and location information
                only for legitimate transport and safety purposes; do not copy,
                disclose, or use it for another purpose or share it with
                unauthorized people.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Location and device permissions
              </Text>
              <Text style={styles.termsParagraph}>
                Some features need location, notification, or other device
                permissions. You can manage permissions in your device settings,
                but turning them off may limit tracking, trip updates, or
                alerts. When using location features, drivers must follow
                applicable laws and use them only while carrying out authorized
                transport activities.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Transport services and payments
              </Text>
              <Text style={styles.termsParagraph}>
                Track My Kid is a coordination and communication platform; it
                does not itself provide or operate a transport service unless
                explicitly stated. Transport arrangements, supervision, safety,
                and performance remain the responsibility of the relevant
                transport provider and the parties who arrange the trip. Any
                subscription, transport charge, service fee, payment schedule,
                or refund terms shown to you apply to your account or
                arrangement. Review those details before confirming a payment.
                Payment processing may be provided by third parties and is
                subject to their terms.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Personal information
              </Text>
              <Text style={styles.termsParagraph}>
                We use account, child, trip, and device information to provide
                and protect the service, enable authorized transport
                coordination, and communicate relevant updates. Access to
                information is limited to what is needed for the relevant
                service purpose, subject to applicable law. Please review the
                Track My Kid Privacy Policy for details about collection, use,
                sharing, retention, and your privacy rights.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Safety and availability
              </Text>
              <Text style={styles.termsParagraph}>
                The app is not an emergency service and does not replace direct
                contact with a driver, school, transport provider, or emergency
                services. Transport providers remain responsible for operating
                their services; the app cannot guarantee uninterrupted
                connectivity, location accuracy, or notification delivery.
                Contact the transport provider directly to confirm important
                arrangements, and contact emergency services when immediate
                assistance is needed.
              </Text>
              <Text style={styles.termsSectionTitle}>Acceptable use</Text>
              <Text style={styles.termsParagraph}>
                Do not misuse the service, attempt to access another
                person&apos;s account or data, interfere with its operation, or
                use the platform for unlawful, deceptive, harassing, or harmful
                purposes. Do not upload content that is unlawful, infringes
                another person&apos;s rights, or exposes a child or another
                person to risk. You are responsible for content and information
                you submit and for having the rights and permissions needed to
                submit them.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Service changes and account restrictions
              </Text>
              <Text style={styles.termsParagraph}>
                We may update, suspend, or discontinue features to maintain or
                improve the service, address security or operational issues, or
                comply with law. We may restrict or suspend an account where we
                reasonably believe these terms have been breached, an account
                is compromised, or continued access could put users or the
                service at risk. Where practicable, we will provide notice and
                an opportunity to resolve the issue.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Our content and software
              </Text>
              <Text style={styles.termsParagraph}>
                Track My Kid and its licensors retain their rights in the app,
                branding, and service content. You may use the service for its
                intended purposes while your account is active. Do not copy,
                modify, distribute, reverse engineer, or commercially exploit
                the service except where the law permits or we have given
                written permission.
              </Text>
              <Text style={styles.termsSectionTitle}>
                Liability and applicable law
              </Text>
              <Text style={styles.termsParagraph}>
                Nothing in these terms excludes or limits a right or liability
                that cannot lawfully be excluded or limited. To the extent
                permitted by law, Track My Kid is not responsible for indirect
                losses or for transport services, devices, networks, or
                third-party services outside its control. These terms are
                subject to the laws that apply where you use the service,
                including applicable South African law, without limiting
                mandatory consumer or privacy rights.
              </Text>
              <Text style={styles.termsSectionTitle}>Questions or changes</Text>
              <Text style={styles.termsParagraph}>
                We may update these terms as the service or applicable law
                changes. We will indicate the current terms in the app when
                reasonably practicable. If you do not agree to an update, stop
                using the service and contact support about your account.
                Contact Track My Kid support if you have questions.
              </Text>
            </ScrollView>
            <View style={styles.termsModalActions}>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styles.termsModalCancel}
              >
                <Text style={styles.termsModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setAcceptedTerms(true);
                  setErrors((current) => ({ ...current, terms: undefined }));
                  setTermsModalVisible(false);
                }}
                style={styles.termsModalDone}
              >
                <Text style={styles.termsModalDoneText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5FAFF",
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
    paddingBottom: 20,
  },
  scrollContentGrow: {
    justifyContent: "space-between",
  },
  topSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#174574",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    color: "#64809C",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  card: {
    marginHorizontal: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D8EAF9",
    shadowColor: "#174574",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryButton: {
    marginTop: 12,
  },
  primaryButtonGradient: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderWidth: 1.5,
    borderColor: "#AFC2D4",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  termsCheckboxChecked: {
    borderColor: "#173F70",
    backgroundColor: "#173F70",
  },
  termsCheckboxError: {
    borderColor: "#DC4545",
  },
  termsCopy: {
    flex: 1,
    color: "#64809C",
    fontSize: 11,
    lineHeight: 16,
  },
  termsLink: {
    color: "#1769D2",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  termsErrorText: {
    marginTop: 6,
    color: "#DC4545",
    fontSize: 10,
    lineHeight: 14,
  },
  termsModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,35,55,0.55)",
  },
  termsModalCard: {
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  termsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  termsModalEyebrow: {
    color: "#64809C",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  termsModalTitle: {
    marginTop: 3,
    color: "#174574",
    fontSize: 19,
    fontWeight: "800",
  },
  termsModalClose: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F6FA",
  },
  termsModalScroll: {
    flexShrink: 1,
  },
  termsIntro: {
    marginBottom: 14,
    color: "#35516B",
    fontSize: 12,
    lineHeight: 18,
  },
  termsSectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    color: "#174574",
    fontSize: 13,
    fontWeight: "800",
  },
  termsParagraph: {
    color: "#526981",
    fontSize: 11,
    lineHeight: 17,
  },
  termsModalDone: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#173F70",
  },
  termsModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  termsModalCancel: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#35516B",
    backgroundColor: "#FFFFFF",
  },
  termsModalCancelText: {
    color: "#35516B",
    fontSize: 13,
    fontWeight: "700",
  },
  termsModalDoneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ECECEC",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#64809C",
    fontSize: 10,
  },
  socialButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#F5FAFF",
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
    fontSize: 12,
    color: "#174574",
    fontWeight: "700",
  },
  bottomRow: {
    marginTop: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "center",
  },
  bottomText: {
    color: "#64809C",
    fontSize: 10,
  },
  linkText: {
    color: "#1769D2",
    fontWeight: "700",
    fontSize: 10,
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
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,35,55,0.55)",
  },

  modalCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },

  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
  },

  modalScroll: {
    flex: 1,
  },

  modalBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#35516B",
    paddingBottom: 20,
  },

  modalBold: {
    fontWeight: "700",
    color: "#174574",
  },

  understandBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  understandBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  modalClose: {
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  modalCloseText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  scanSection: {
    marginBottom: 16,
    backgroundColor: "#F5FAFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D8EAF9",
  },
  scanTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#174574",
    marginBottom: 6,
  },
  scanDescription: {
    color: "#64809C",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  scanInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D8EAF9",
  },
  scanInfoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#35516B",
    marginTop: 10,
  },
  scanInfoText: {
    fontSize: 11,
    color: "#174574",
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: "#0A84FF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  scanPromptCard: {
    backgroundColor: "#EAF4FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D0E7FF",
  },
  scanPromptText: {
    color: "#1F3C72",
    fontSize: 11,
    lineHeight: 16,
  },
  scanRequiredText: {
    color: "#D36B5C",
    fontSize: 10,
    marginBottom: 12,
  },
  scanModalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
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
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scanLoadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 11,
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    marginBottom: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  infoIcon: {
    marginTop: 1,
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
