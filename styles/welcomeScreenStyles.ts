import { Dimensions, StyleSheet } from "react-native";
import { useTheme } from "./theme";

export const useWelcomeScreenStyles = () => {
  const { colors, shadows } = useTheme();
  const { width, height } = Dimensions.get("window");

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "white" },

    header: {
      alignItems: "center",
      paddingVertical: 20,
      borderBottomWidth: 1,
      marginBottom: 16,
    },

    logo: {
      width: 200,
      height: 200,
      resizeMode: "contain",
      marginBottom: 6,
    },

    title: { fontSize: 19, fontWeight: "800" },

    tagline: {
      fontSize: 19,
      color: "#174574",
      marginTop: 6,
      fontWeight: "800",
    },

    taglineSecondary: {
      fontSize: 15,
      color: "#1769D2",
      marginTop: 2,
      fontWeight: "700",
    },

    subText: {
      fontSize: 11,
      marginTop: 10,
      textAlign: "center",
      paddingHorizontal: 18,
      lineHeight: 16,
    },

    scrollView: {
      flex: 1,
      width: "100%",
      backgroundColor: "white",
    },

    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
      alignItems: "center",
    },

    contentWrapper: {
      width: "100%",
      maxWidth: width,
      paddingTop: 4,
      paddingHorizontal: 18,
      alignItems: "center",
    },

    selectRoleContainer: {
      width: "100%",
      paddingTop: 8,
      paddingHorizontal: 18,
      alignItems: "center",
    },

    headerRow: {
      width: "100%",
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      marginBottom: 8,
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
    },

    roleSubtitle: {
      fontSize: 11,
      textAlign: "center",
      marginBottom: 16,
      lineHeight: 16,
    },

    roleCards: {
      width: "100%",
    },

    roleCard: {
      width: "100%",
      borderRadius: 14,
      padding: 12,
      marginBottom: 9,
      borderWidth: 1,
    },

    roleCardSelected: {
      borderWidth: 2,
      transform: [{ scale: 1.01 }],
    },

    roleCardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    roleCardImage: {
      width: 48,
      height: 48,
      borderRadius: 14,
      marginRight: 10,
    },

    roleCardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    roleCardIcon: {
      fontSize: 14,
    },

    roleCardText: {
      flex: 1,
      paddingRight: 10,
    },

    roleCardTitle: {
      fontSize: 14,
      fontWeight: "800",
    },

    roleCardDescription: {
      fontSize: 10,
      marginTop: 3,
      lineHeight: 14,
    },

    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },

    radioSelected: {
      borderColor: "#FFFFFF",
    },

    radioFilled: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#FFFFFF",
    },

    heroCard: {
      width: "100%",
      borderRadius: 16,
      padding: 16,
      marginTop: 18,
      marginBottom: 14,
      borderWidth: 1,
      shadowColor: "#000",
    },

    heroBadgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },

    heroBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },

    heroBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },

    heroContent: {
      alignItems: "center",
    },

    heroEyebrow: {
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      marginBottom: 8,
    },

    heroStats: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 14,
      borderRadius: 12,
      padding: 10,
    },

    heroStat: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },

    heroStatValue: {
      fontSize: 15,
      fontWeight: "800",
    },

    heroStatLabel: {
      fontSize: 11,
      marginTop: 3,
      textAlign: "center",
    },

    ctaWrap: {
      width: "100%",
      paddingHorizontal: 8,
      alignItems: "center",
      marginTop: 4,
    },

    continueBtn: {
      width: "100%",
      maxWidth: width - 32,
      backgroundColor: "#173F70",
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },

    continueBtnDisabled: {
      backgroundColor: "#94A3B8",
    },

    continueText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
    },

    helpText: {
      color: "#64748B",
      fontSize: 10,
      textAlign: "center",
    },

    section: { paddingHorizontal: 18, marginTop: 18 },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 9,
    },

    featureCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#EAF3FF",
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
    },

    featureIcon: { marginRight: 10 },

    featureText: { fontWeight: "600" },

    step: {
      fontSize: 11,
      marginBottom: 5,
      color: "#555",
    },

    card: {
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },

    cardTitle: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 14,
    },

    cardDesc: {
      color: "#FFF",
      fontSize: 10,
      marginTop: 4,
    },

    loginBtn: {
      borderWidth: 1,
      borderColor: "#4A90E2",
      padding: 14,
      borderRadius: 10,
      alignItems: "center",
    },

    loginText: { color: "#4A90E2", fontWeight: "600" },

    trustBox: {
      backgroundColor: "#EAF3FF",
      margin: 20,
      padding: 12,
      borderRadius: 10,
    },

    heroImageWrap: {
      width: "100%",
      height: 210,
      position: "relative",
      overflow: "hidden",
      marginTop: 12,
      marginBottom: -22,
    },

    heroImage: {
      width: "100%",
      height: "100%",
    },

    imageFade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 96,
    },

    getStartedBtn: {
      width: "100%",
      maxWidth: width - 32,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 18,
      marginBottom: 8,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },

    getStartedText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
    },

    loginLinkWrap: {
      paddingVertical: 6,
    },

    loginLink: {
      color: "#1769D2",
      fontSize: 12,
      fontWeight: "700",
    },

    trustTitle: {
      fontWeight: "700",
      marginBottom: 6,
    },

    trustText: {
      fontSize: 10,
      color: "#333",
    },

    testimonial: {
      backgroundColor: "#FFF",
      padding: 14,
      borderRadius: 12,
      marginBottom: 10,
    },

    quote: {
      fontStyle: "italic",
      color: "#444",
    },

    author: {
      marginTop: 6,
      fontSize: 10,
      color: "#888",
    },

    stats: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 30,
    },

    statCard: { alignItems: "center" },

    statNumber: { color: "#4A90E2", fontWeight: "700" },

    statLabel: { fontSize: 10, color: "#666" },

    footer: {
      marginTop: 16,
      marginBottom: 12,
      alignItems: "center",
    },

    themeToggleContainer: {
      position: "absolute",
      top: 0,
      right: 0,
      zIndex: 1,
    },
    headerWrapper: {
      width: "100%",
      alignItems: "center",
      paddingTop: 10,
    },
    footerText: {
      fontSize: 10,
      color: "#999",
    },
  });
};

export type WelcomeScreenStyles = ReturnType<typeof useWelcomeScreenStyles>;
