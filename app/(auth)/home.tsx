import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import ThemeToggle from "../../components/ThemeTggle";
// import Login from "./login";
// import Register from "./register";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../styles/theme";
import { useWelcomeScreenStyles } from "../../styles/welcomeScreenStyles";
import Login from "./login";
import Register from "./register";

const WelcomeScreen = () => {
  const { colors, isDark } = useTheme();

  const styles = useWelcomeScreenStyles();
  const [userType, setUserType] = useState<
    "client" | "owner" | "driver" | "school" | null
  >(null);

  const [currentStep, setCurrentStep] = useState<"welcome" | "selectRole">(
    "welcome",
  );
  const [selectedRole, setSelectedRole] = useState<
    "client" | "owner" | "driver" | "school" | null
  >(null);
  const [visible, setVisible] = useState(false);
  const [signupVisible, setSignupVisible] = useState(false);

  const roleOptions = [
    {
      role: "owner" as const,
      title: "Owner",
      description: "I manage the transport business and oversee operations.",
      icon: require("@/assets/images/owner.png"),
      background: "#34C759",
    },
    {
      role: "driver" as const,
      title: "Driver",
      description: "I drive and manage trips, pickups and drop-offs.",
      icon: require("@/assets/images/driver.jpeg"),
      background: "#3B82F6",
    },
    {
      role: "client" as const,
      title: "Parent",
      description: "I want to track my child, get alerts and stay updated.",
      icon: require("@/assets/images/client.png"),
      background: "#FF9F0A",
    },
    {
      role: "school" as const,
      title: "School",
      description: "I manage students and transport from the school side.",
      icon: require("@/assets/images/school.jpeg"),
      background: "#6366F1",
    },
  ];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleGetStarted = () => {
    setCurrentStep("selectRole");
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    setUserType(selectedRole);
    setSignupVisible(true);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: colors.background },
        ]}
      >
        {/* <View style={styles.themeToggleContainer}>
          <ThemeToggle />
        </View> */}

        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {currentStep === "welcome" ? (
            <>
              {/* HERO */}
              <View style={styles.headerWrapper}>
                <View
                  style={[
                    styles.heroCard,
                    {
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.heroContent}>
                    <Image
                      source={require("@/assets/images/logo.png")}
                      style={styles.logo}
                    />

                    <View style={styles.heroBadgeRow}>
                      <View
                        style={[
                          styles.heroBadge,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.heroBadgeText,
                            { color: colors.primary },
                          ]}
                        >
                          Live tracking
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.heroBadge,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.heroBadgeText,
                            { color: colors.primary },
                          ]}
                        >
                          Smart alerts
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.tagline, { color: colors.primary }]}>
                      Peace of mind.
                    </Text>
                    <Text
                      style={[
                        styles.taglineSecondary,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Every trip. Every day.
                    </Text>
                    <Text
                      style={[styles.subText, { color: colors.text.primary }]}
                    >
                      Track your child in real time, get smart alerts, and stay
                      connected on every journey.
                    </Text>
                    <View
                      style={[
                        styles.heroStats,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <View style={styles.heroStat}>
                        <Text
                          style={[
                            styles.heroStatValue,
                            { color: colors.primary },
                          ]}
                        >
                          24/7
                        </Text>
                        <Text
                          style={[
                            styles.heroStatLabel,
                            { color: colors.text.secondary },
                          ]}
                        >
                          Child safety
                        </Text>
                      </View>
                      <View style={styles.heroStat}>
                        <Text
                          style={[
                            styles.heroStatValue,
                            { color: colors.primary },
                          ]}
                        >
                          Instant
                        </Text>
                        <Text
                          style={[
                            styles.heroStatLabel,
                            { color: colors.text.secondary },
                          ]}
                        >
                          Updates
                        </Text>
                      </View>
                      <View style={styles.heroStat}>
                        <Text
                          style={[
                            styles.heroStatValue,
                            { color: colors.primary },
                          ]}
                        >
                          Secure
                        </Text>
                        <Text
                          style={[
                            styles.heroStatLabel,
                            { color: colors.text.secondary },
                          ]}
                        >
                          Access
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* HERO ILLUSTRATION */}
              <View style={styles.heroImageWrap}>
                {isDark ? (
                  <Image
                    source={require("@/assets/images/ilustration-dark.png")}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require("@/assets/images/ilustration.jpeg")}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                )}

                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(255,255,255,0.2)",
                    "rgba(255,255,255,0.6)",
                    colors.background,
                  ]}
                  locations={[0, 0.45, 0.75, 1]}
                  style={styles.imageFade}
                />
              </View>

              <View style={styles.ctaWrap}>
                <TouchableWithoutFeedback onPress={handleGetStarted}>
                  <LinearGradient
                    colors={["#4E54FF", "#3247FF"]}
                    style={styles.getStartedBtn}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                  >
                    <Text style={styles.getStartedText}>Get Started</Text>
                  </LinearGradient>
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={() => setVisible(true)}>
                  <View style={styles.loginLinkWrap}>
                    <Text style={styles.loginLink}>Login</Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2026 Track My Kid • Keeping children safe on every journey
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.selectRoleContainer}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={[
                    styles.backButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setCurrentStep("welcome")}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>

                <Text
                  style={[styles.roleTitle, { color: colors.text.primary }]}
                >
                  Let&apos;s get started!
                </Text>
              </View>

              {isDark ? (
                <Image
                  source={require("@/assets/images/logo-dark.png")}
                  style={styles.logo}
                />
              ) : (
                <Image
                  source={require("@/assets/images/logo-light.png")}
                  style={styles.logo}
                />
              )}
              <Text
                style={[styles.roleSubtitle, { color: colors.text.secondary }]}
              >
                Choose your role to personalize your experience
              </Text>

              <View style={styles.roleCards}>
                {roleOptions.map((option) => {
                  const selected = selectedRole === option.role;
                  return (
                    <TouchableOpacity
                      key={option.role}
                      onPress={() => setSelectedRole(option.role)}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: selected
                            ? `${option.background}E6`
                            : "transparent",
                          borderColor: selected
                            ? option.background
                            : colors.border,
                        },
                        selected && styles.roleCardSelected,
                      ]}
                    >
                      <View style={styles.roleCardRow}>
                        <View
                          style={[
                            styles.roleCardIconWrap,
                            { backgroundColor: `${option.background}33` },
                          ]}
                        >
                          <Image
                            source={option.icon}
                            style={{ width: 44, height: 44, borderRadius: 22 }}
                          />
                        </View>
                        <View style={styles.roleCardText}>
                          <Text
                            style={[
                              styles.roleCardTitle,
                              {
                                color: selected ? "#fff" : colors.text.primary,
                              },
                            ]}
                          >
                            {option.title}
                          </Text>
                          <Text
                            style={[
                              styles.roleCardDescription,
                              {
                                color: selected
                                  ? "#fff"
                                  : colors.text.secondary,
                              },
                            ]}
                          >
                            {option.description}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                            !selected && {
                              borderColor: selected ? "#fff" : colors.border,
                            },
                          ]}
                        >
                          {selected ? (
                            <View
                              style={[
                                styles.radioFilled,
                                { backgroundColor: option.background },
                              ]}
                            />
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedRole && (
                <View style={styles.ctaWrap}>
                  <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!selectedRole}
                    style={[
                      styles.continueBtn,
                      !selectedRole && styles.continueBtnDisabled,
                    ]}
                  >
                    <Text style={styles.continueText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={visible} transparent animationType="slide">
        <Login
          userType={userType}
          setVisible={setVisible}
          setSignupVisible={setSignupVisible}
          onSignUpPress={() => {
            setVisible(false);
            setSignupVisible(false);
            setCurrentStep("selectRole");
          }}
        />
      </Modal>

      <Modal visible={signupVisible} transparent animationType="slide">
        <Register
          userType={userType}
          setSignupVisible={setSignupVisible}
          setVisible={setVisible}
        />
      </Modal>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
